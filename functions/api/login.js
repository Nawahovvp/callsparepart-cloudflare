import { jsonResponse, readJsonBody } from '../_shared';

const EMPLOYEE_URL = 'https://opensheet.elk.sh/1eqVoLsZxGguEbRCC5rdI4iMVtQ7CK4T3uXRdx8zE3uw/EmployeeWeb';

export async function onRequestPost({ request, env, waitUntil }) {
    const parsed = await readJsonBody(request);
    if (parsed.error) return parsed.error;

    const { username, password } = parsed.data;
    if (typeof username !== 'string' || !/^7\d{6}$/.test(username)) {
        return jsonResponse({ error: 'รหัสพนักงานต้องเป็น 7 หลักและเริ่มต้นด้วย 7' }, 400);
    }
    if (typeof password !== 'string' || !/^\d{4}$/.test(password)) {
        return jsonResponse({ error: 'รหัสผ่านต้องเป็น 4 หลัก' }, 400);
    }
    if (password !== username.slice(-4)) {
        return jsonResponse({ error: 'รหัสผ่านไม่ถูกต้อง (ใช้ 4 หลักสุดท้ายของรหัสพนักงาน)' }, 401);
    }

    let employees;
    try {
        const response = await fetch(EMPLOYEE_URL, {
            headers: { Accept: 'application/json' }
        });
        if (!response.ok) {
            return jsonResponse({ error: `ไม่สามารถตรวจสอบพนักงานได้ (HTTP ${response.status})` }, 502);
        }
        employees = await response.json();
    } catch (error) {
        console.error('Employee lookup failed:', error);
        return jsonResponse({ error: 'ไม่สามารถเชื่อมต่อข้อมูลพนักงานได้' }, 502);
    }

    const user = Array.isArray(employees)
        ? employees.find((employee) => employee.IDRec === username && employee.Name)
        : null;
    if (!user) {
        return jsonResponse({ error: 'ไม่พบข้อมูลพนักงานนี้' }, 401);
    }

    const logUrl = env.LOGIN_LOG_URL;
    if (logUrl) {
        waitUntil((async () => {
            try {
                const response = await fetch(logUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                    body: JSON.stringify({
                        action: 'login',
                        userId: user.IDRec,
                        userName: user.Name,
                        userPlant: user.Plant || '-',
                        status: 'SUCCESS'
                    })
                });
                if (!response.ok) {
                    console.warn('Login log endpoint returned HTTP', response.status);
                }
            } catch (error) {
                console.warn('Login logging failed:', error);
            }
        })());
    }

    return jsonResponse(user);
}
